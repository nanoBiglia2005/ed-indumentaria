import textwrap

import win32print

ESC = b'\x1B'
GS = b'\x1D'

# Ancho del papel en caracteres con la fuente A (80mm ~ 48, 58mm ~ 32).
ANCHO_TICKET_POR_DEFECTO = 48

# Tickets identicos por venta: uno para el cliente y otro para el local.
COPIAS_REMITO = 2

# GS ! n  ->  n = (ancho - 1) * 16 + (alto - 1)
TAMANO_NORMAL = 0x00
TAMANO_DOBLE = 0x11


def _imprimir_raw(nombre_documento: str, data: bytes, printer_name: str | None) -> None:
    # GetDefaultPrinter() es una impresora predeterminada por sesion de usuario:
    # bajo el servicio de Windows (cuenta LocalSystem) no coincide con la del
    # usuario interactivo, asi que hay que pasar el nombre explicitamente.
    hPrinter = win32print.OpenPrinter(printer_name or win32print.GetDefaultPrinter())

    try:
        win32print.StartDocPrinter(hPrinter, 1, (nombre_documento, None, "RAW"))
        win32print.StartPagePrinter(hPrinter)

        win32print.WritePrinter(hPrinter, data)

        win32print.EndPagePrinter(hPrinter)
        win32print.EndDocPrinter(hPrinter)
    finally:
        win32print.ClosePrinter(hPrinter)


def _texto(valor) -> bytes:
    # CP437 es la codepage por defecto de la mayoria de las impresoras ESC/POS
    # e incluye los acentos y la enie del español.
    return str(valor).encode("cp437", errors="replace")


def _formato_precio(valor) -> str:
    numero = float(valor or 0)
    if numero.is_integer():
        return f"{int(numero)}$"
    return f"{numero:.2f}$"


def _dos_columnas(izquierda: str, derecha: str, columnas: int) -> str:
    """Arma una linea con `izquierda` pegada al margen y `derecha` al final."""
    espacio = max(columnas - len(derecha), 1)
    if len(izquierda) > espacio:
        izquierda = izquierda[:espacio]
    return izquierda.ljust(espacio) + derecha


def _centrar(texto: str, ancho: int) -> str:
    # A proposito NO se recorta: antes que imprimir un precio truncado (y por lo
    # tanto equivocado) se deja desbordar la columna y que la impresora lo parta.
    if len(texto) >= ancho:
        return texto
    return texto.center(ancho)


def _anchos_columnas(columnas: int) -> tuple[int, int, int]:
    """Reparte el ancho del ticket entre Precio Unit. / Cant. / Total.

    La columna de Total se lleva mas lugar porque muestra el par
    efectivo|tarjeta, mientras que la de Precio Unit. lleva un solo importe.
    """
    ancho_cantidad = max(5, round(columnas * 0.17))
    ancho_precio = max(len("Precio Unit."), round(columnas * 0.27))
    ancho_total = columnas - ancho_cantidad - ancho_precio
    return ancho_precio, ancho_cantidad, ancho_total


def _tres_columnas(izquierda: str, centro: str, derecha: str, anchos: tuple[int, int, int]) -> str:
    return (
        _centrar(izquierda, anchos[0]) + _centrar(centro, anchos[1]) + _centrar(derecha, anchos[2])
    ).rstrip()


def _anchos_total(columnas: int) -> tuple[int, int, int]:
    """Tres columnas para el bloque del total: [vacia][efectivo][tarjeta].

    Los importes van en doble tamaño y las etiquetas de abajo en tamaño normal.
    Como a doble ancho cada caracter ocupa 2 columnas, los importes usan la mitad
    de estos anchos y asi ambas filas terminan alineadas.
    """
    ancho = columnas // 3
    return (ancho, ancho, columnas - 2 * ancho)


def _par_precios(efectivo: str, tarjeta: str, ancho: int) -> str:
    """'100$ | 115$', o sin espacios si no entra en la columna."""
    con_espacios = f"{efectivo} | {tarjeta}"
    if len(con_espacios) <= ancho:
        return con_espacios
    return f"{efectivo}|{tarjeta}"


def imprimir_barcode(codigo, printer_name: str | None = None) -> None:
    data = bytearray()

    data += ESC + b'a\x01'

    data += GS + b'h' + bytes([160])  # alto
    data += GS + b'w' + bytes([4])    # ancho de barra
    data += GS + b'H' + bytes([0])    # sin HRI automatico: el texto de abajo lo imprimimos nosotros con el prefijo
    data += GS + b'f' + bytes([0])    # fuente del HRI

    barcode_texto = f"{codigo}"
    barcode_contenido = b'{B' + barcode_texto.encode("ascii")

    data += GS + b'k' + bytes([73, len(barcode_contenido)]) + barcode_contenido

    # Texto legible con el prefijo completo, debajo del codigo
    data += f"77900000{codigo}\n".encode("ascii")

    # Izquierda de nuevo
    data += ESC + b'a\x00'

    # Alimentar papel
    data += ESC + b'd\x07'

    # Corte
    data += GS + b'V\x00'

    _imprimir_raw("Barcode", bytes(data), printer_name)


def imprimir_remito(
    remito: dict,
    printer_name: str | None = None,
    columnas: int = ANCHO_TICKET_POR_DEFECTO,
    copias: int = COPIAS_REMITO,
) -> None:
    """Imprime el remito de una venta mostrando los precios en efectivo y en tarjeta.

    `remito` es el payload que arma el backend: fecha, recargo de tarjeta, totales
    e items con descripcion, cantidad, precio unitario y subtotal (en ambas formas
    de pago).

    Se imprimen `copias` tickets identicos (uno para el cliente y otro para el local).
    """
    data = bytearray()

    data += ESC + b'@'                # inicializar
    data += ESC + b't' + bytes([0])   # codepage CP437

    # --- Encabezado: numero de remito a la izquierda, fecha a la derecha ---
    encabezado_izquierda = "Cliente = Stefano Biglia"
    data += ESC + b'a\x00'
    data += _texto(_dos_columnas(encabezado_izquierda, str(remito.get("fecha") or ""), columnas) + "\n")

    # --- Items ---
    data += b'\n'
    data += ESC + b'a\x00'
    data += _texto("-" * columnas + "\n")

    anchos = _anchos_columnas(columnas)

    for item in remito.get("items", []):
        # Descripcion centrada y en doble tamaño: a doble ancho entra la mitad de texto.
        descripcion = str(item.get("descripcion") or "Sin Descripcion")
        data += ESC + b'a\x01'
        data += GS + b'!' + bytes([TAMANO_DOBLE])
        data += ESC + b'E\x01'
        for linea in textwrap.wrap(descripcion, max(columnas // 2, 1)) or [""]:
            data += _texto(linea + "\n")
        data += ESC + b'E\x00'
        data += GS + b'!' + bytes([TAMANO_NORMAL])

        # Encabezados y valores, en tres columnas
        data += ESC + b'a\x00'
        data += ESC + b'E\x01'
        data += _texto(_tres_columnas("Precio Unit.", "Cant.", "Total", anchos) + "\n")
        data += ESC + b'E\x00'

        # El unitario va solo con el precio original: el recargo se ve en el Total.
        unitario = _formato_precio(item.get('precio_efectivo'))
        total_item = _par_precios(
            _formato_precio(item.get('subtotal_efectivo')),
            _formato_precio(item.get('subtotal_tarjeta')),
            anchos[2],
        )
        data += _texto(
            _tres_columnas(unitario, str(item.get('cantidad', 0)), total_item, anchos) + "\n"
        )

        data += _texto("-" * columnas + "\n")

    # --- Total, con las etiquetas Efectivo/Tarjeta debajo de cada importe ---
    anchos_total = _anchos_total(columnas)
    # A doble ancho cada caracter ocupa 2 columnas: media medida por columna.
    anchos_importes = tuple(ancho // 2 for ancho in anchos_total)

    data += b'\n'
    data += ESC + b'a\x00'
    data += ESC + b'E\x01'
    data += GS + b'!' + bytes([TAMANO_DOBLE])
    # "TOTAL" va en la primera columna (la que quedaba vacia), asi los importes
    # no se corren y siguen alineados con las etiquetas de abajo.
    data += _texto(
        _tres_columnas(
            "TOTAL",
            _formato_precio(remito.get('total_efectivo')),
            _formato_precio(remito.get('total_tarjeta')),
            anchos_importes,
        )
        + "\n"
    )
    data += GS + b'!' + bytes([TAMANO_NORMAL])
    data += _texto(_tres_columnas("", "Efectivo", "Tarjeta", anchos_total) + "\n")
    data += ESC + b'E\x00'

    recargo = float(remito.get("recargo_tarjeta") or 0)
    if recargo:
        recargo_texto = f"{int(recargo)}" if recargo.is_integer() else f"{recargo:.2f}"
        linea_recargo = f"({recargo_texto}% Recargo)"
        if len(linea_recargo) <= anchos_total[2]:
            # Debajo de "Tarjeta", que es el precio al que se le aplica el recargo.
            data += _texto(_tres_columnas("", "", linea_recargo, anchos_total) + "\n")
        else:
            # En papel angosto no entra en esa columna: se pega al margen derecho.
            data += _texto(linea_recargo.rjust(columnas) + "\n")

    # Alimentar papel
    data += ESC + b'd\x07'

    # Corte
    data += GS + b'V\x00'

    # Las copias salen como UN solo trabajo de impresion: repetir el buffer es una
    # copia de memoria contra abrir/cerrar el spooler una vez por ticket. Cada copia
    # arranca con su propio ESC @ y termina en su corte, asi que sale autocontenida.
    _imprimir_raw("Remito", bytes(data) * copias, printer_name)
