import textwrap
import unicodedata
from pathlib import Path

import win32print
from PIL import Image

# La "ñ" no tiene un equivalente ASCII de una sola letra al separar el acento
# (unicodedata la deja en "n"), asi que se reemplaza a mano antes de normalizar.
_REEMPLAZOS_ESPECIALES = {
    "ñ": "ni",
    "Ñ": "NI",
}

ESC = b'\x1B'
GS = b'\x1D'

# Ancho del papel en caracteres con la fuente A (80mm ~ 48, 58mm ~ 32).
ANCHO_TICKET_POR_DEFECTO = 48

# Ancho del papel en puntos (dots) a 203dpi: 48 caracteres * ~12 dots/caracter
# de Fuente A. Se usa para redimensionar imagenes al ancho imprimible.
ANCHO_PAPEL_DOTS = ANCHO_TICKET_POR_DEFECTO * 12

# El logo se imprime mas chico que el ancho del papel, centrado.
ANCHO_LOGO_DOTS = round(ANCHO_PAPEL_DOTS * 0.40)

# El logo viaja junto a este script (no se referencia frontend/public, que no
# existe en la PC del cliente donde se instala este servicio por separado).
RUTA_LOGO = Path(__file__).resolve().parent / "assets" / "logo.png"

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
    # Se normaliza a ASCII puro en vez de depender de que la impresora tenga
    # bien configurada una codepage con acentos (varia segun el modelo/clon).
    texto = str(valor)
    for original, reemplazo in _REEMPLAZOS_ESPECIALES.items():
        texto = texto.replace(original, reemplazo)
    texto = unicodedata.normalize("NFKD", texto)
    return texto.encode("ascii", errors="ignore")


def _imagen_raster(
    ruta: Path, ancho_dots: int, ancho_imagen_dots: int | None = None, alineacion: str = "centro"
) -> bytes:
    """Convierte una imagen a los bytes que espera GS v 0 (impresion raster
    ESC/POS): la redimensiona preservando la relacion de aspecto, aplana la
    transparencia sobre fondo blanco (la impresora no tiene canal alfa), la
    pasa a blanco y negro puro (con dithering para que los grises no queden
    en bloques duros) y empaqueta los pixeles a 1 bit por punto, 8 puntos
    por byte.

    Si `ancho_imagen_dots` es mas chico que `ancho_dots`, la imagen se dibuja
    a ese tamaño reducido dentro de un lienzo del ancho total del papel (con
    margen blanco), ubicada segun `alineacion` ("centro" o "izquierda"): GS
    v 0 no respeta el comando de justificacion de texto (ESC a), asi que la
    posicion se arma a mano en los propios pixeles en vez de confiar en eso.
    """
    ancho_imagen_dots = ancho_imagen_dots or ancho_dots
    imagen = Image.open(ruta)

    if imagen.mode in ("RGBA", "LA") or (imagen.mode == "P" and "transparency" in imagen.info):
        imagen = imagen.convert("RGBA")
        fondo = Image.new("RGB", imagen.size, "white")
        fondo.paste(imagen, mask=imagen.split()[-1])
        imagen = fondo

    ancho_original, alto_original = imagen.size
    alto_dots = round(alto_original * (ancho_imagen_dots / ancho_original))
    imagen = imagen.convert("L").resize((ancho_imagen_dots, alto_dots))
    imagen = imagen.convert("1")  # blanco y negro puro (dithering Floyd-Steinberg por defecto)

    if ancho_imagen_dots < ancho_dots:
        margen = (ancho_dots - ancho_imagen_dots) // 2 if alineacion == "centro" else 0
        lienzo = Image.new("1", (ancho_dots, alto_dots), 1)  # 1 = blanco en modo "1"
        lienzo.paste(imagen, (margen, 0))
        imagen = lienzo

    ancho_bytes = (ancho_dots + 7) // 8
    pixeles = imagen.load()
    datos = bytearray(ancho_bytes * alto_dots)
    for y in range(alto_dots):
        fila = y * ancho_bytes
        for x in range(ancho_dots):
            # En modo "1" de Pillow 0 = negro, 255 = blanco: se invierte
            # porque GS v 0 espera bit=1 para "imprimir" (negro).
            if pixeles[x, y] == 0:
                datos[fila + x // 8] |= 0x80 >> (x % 8)

    encabezado = bytes([ancho_bytes % 256, ancho_bytes // 256, alto_dots % 256, alto_dots // 256])
    return GS + b'v0\x00' + encabezado + bytes(datos)


def _formato_numero(numero: float, decimales: int) -> str:
    """Separador de miles '.' y decimal ',' (convencion Argentina), sin depender
    de la configuracion regional (locale) de la maquina donde corra el servicio."""
    formateado = f"{numero:,.{decimales}f}"
    return formateado.replace(",", "_").replace(".", ",").replace("_", ".")


def _formato_precio(valor) -> str:
    numero = float(valor or 0)
    if numero.is_integer():
        return f"${_formato_numero(numero, 0)}"
    return f"${_formato_numero(numero, 2)}"


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


def _anchos_total(columnas: int, ancho_etiqueta: int = 10) -> tuple[int, int, int]:
    """Reparte el bloque de TOTAL: la etiqueta "TOTAL" pegada al margen
    izquierdo (sin centrar), y Efectivo/Tarjeta centrados cada uno en la
    mitad del espacio restante.

    Estos anchos estan en unidades de ancho NORMAL (columnas completas); la
    fila de valores se imprime a TAMANO_DOBLE, asi que en el llamador se usa
    la mitad de estos anchos (mismo ajuste que en el resto del ticket para
    todo lo que se imprime a doble ancho). `ancho_etiqueta` es par (10 = el
    doble de "TOTAL", 5 caracteres) para que la mitad calce exacto.
    """
    restante = columnas - ancho_etiqueta
    ancho_valor = restante // 2
    return (ancho_etiqueta, ancho_valor, restante - ancho_valor)


def _fila_total(etiqueta: str, valor_izq: str, valor_der: str, anchos: tuple[int, int, int]) -> str:
    """Arma la fila de TOTAL: `etiqueta` pegada al margen izquierdo (sin
    centrar) y los dos valores centrados en el resto del espacio."""
    ancho_etiqueta, ancho_izq, ancho_der = anchos
    return (
        etiqueta.ljust(ancho_etiqueta) + _centrar(valor_izq, ancho_izq) + _centrar(valor_der, ancho_der)
    ).rstrip()


def _par_precios(efectivo: str, tarjeta: str, ancho: int) -> str:
    """'100$ | 115$', o sin espacios si no entra en la columna."""
    con_espacios = f"{efectivo} | {tarjeta}"
    if len(con_espacios) <= ancho:
        return con_espacios
    return f"{efectivo}|{tarjeta}"


def _anchos_fila_articulo(columnas: int, separadores: int = 3) -> tuple[int, int, int, int]:
    """Reparte el ancho del ticket entre Descripcion / Precio / Cant. / Total,
    todo en el mismo renglon (`separadores` = un espacio entre cada columna).

    Precio y Total tienen un ancho minimo pensado para el peor caso realista
    (importes de hasta 6 digitos, ej. "$123.456 | $123.456"): la Descripcion
    se achica para cederles ese espacio, en vez de repartir por porcentaje
    fijo y dejar que Total (que muestra el par efectivo|tarjeta) se desborde.

    El minimo se calcula con `_formato_precio` (no un literal a mano) para que
    no se desactualice si cambia el formato de los precios (ej. separador de
    miles).
    """
    precio_grande = _formato_precio(123456)
    disponible = columnas - separadores
    ancho_cantidad = max(len("Cant."), round(disponible * 0.10))
    ancho_precio = max(len(precio_grande), round(disponible * 0.18))
    ancho_total = max(len(f"{precio_grande} | {precio_grande}"), round(disponible * 0.30))
    ancho_descripcion = disponible - ancho_cantidad - ancho_precio - ancho_total
    return ancho_descripcion, ancho_precio, ancho_cantidad, ancho_total


def _fila_articulo(
    descripcion: str,
    precio: str,
    cantidad: str,
    total: str,
    anchos: tuple[int, int, int, int],
    separador: str = " ",
) -> list[str]:
    """Arma las lineas de un articulo: la descripcion se envuelve a mas de una
    linea si no entra en su columna, y precio/cantidad/total solo van en la
    ULTIMA linea (para no repetirlos ni desalinear las lineas anteriores)."""
    ancho_desc, ancho_precio, ancho_cant, ancho_total = anchos
    lineas_desc = textwrap.wrap(descripcion, ancho_desc) or [""]

    columnas_valores = (
        separador + _centrar(precio, ancho_precio)
        + separador + _centrar(cantidad, ancho_cant)
        + separador + _centrar(total, ancho_total)
    )

    ultima = len(lineas_desc) - 1
    return [
        linea.ljust(ancho_desc) + columnas_valores if i == ultima else linea
        for i, linea in enumerate(lineas_desc)
    ]


def imprimir_barcode(codigo, descripcion: str | None = None, printer_name: str | None = None) -> None:
    data = bytearray()

    data += ESC + b'@'  # inicializar

    # Logo arriba a la izquierda
    data += ESC + b'a\x00'
    data += _imagen_raster(RUTA_LOGO, ANCHO_PAPEL_DOTS, ancho_imagen_dots=ANCHO_LOGO_DOTS, alineacion="izquierda")
    data += b'\n'

    data += ESC + b'a\x01'

    if descripcion:
        data += ESC + b'E\x01'
        data += _texto(f"{descripcion}\n")
        data += ESC + b'E\x00'

    data += GS + b'h' + bytes([160])  # alto
    # Ancho de barra angosto (2, no 4): con header+tail el codigo puede tener
    # hasta 26 caracteres (Code Set B ocupa un simbolo completo por caracter,
    # a diferencia de Set C que empaqueta 2 digitos por simbolo), y a un
    # modulo mas ancho el codigo no entra en el papel y la impresora lo
    # descarta en silencio (sin tirar ningun error).
    data += GS + b'w' + bytes([2])
    data += GS + b'H' + bytes([0])    # sin HRI automatico: el texto de abajo lo imprimimos nosotros con el prefijo
    data += GS + b'f' + bytes([0])    # fuente del HRI

    barcode_contenido = b'{B' + codigo.encode("ascii")

    data += GS + b'k' + bytes([73, len(barcode_contenido)]) + barcode_contenido

    # Texto legible debajo del codigo
    data += _texto(f"{codigo}\n")

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

    data += ESC + b'a\x01'
    data += GS + b'!' + bytes([TAMANO_DOBLE])
    data += _texto(_centrar("Presupuesto", columnas // 2))
    data += b'\n\n'
    data += GS + b'!' + bytes([TAMANO_NORMAL])

    # --- Encabezado: numero de remito a la izquierda, fecha a la derecha ---
    encabezado_izquierda = "Cliente = Stefano Biglia"
    data += ESC + b'a\x00'
    data += _texto(_dos_columnas(encabezado_izquierda, str(remito.get("fecha") or ""), columnas) + "\n")

    # --- Items ---
    # Descripcion y Precio/Cant./Total van en el mismo renglon: el encabezado de
    # columnas se imprime una sola vez (como una tabla), no repetido por articulo.
    data += b'\n'
    anchos_fila = _anchos_fila_articulo(columnas)
    ancho_desc = anchos_fila[0]

    data += ESC + b'a\x00'
    data += ESC + b'E\x01'
    data += _texto(
        "Articulo".ljust(ancho_desc)
        + " " + _centrar("Precio", anchos_fila[1])
        + " " + _centrar("Cant.", anchos_fila[2])
        + " " + _centrar("Total", anchos_fila[3])
        + "\n"
    )
    data += ESC + b'E\x00'
    data += _texto("-" * columnas + "\n")

    for item in remito.get("items", []):
        descripcion = str(item.get("descripcion") or "Sin Nombre")
        unitario = _formato_precio(item.get('precio_efectivo'))
        cantidad = str(item.get('cantidad', 0))
        # El unitario va solo con el precio original: el recargo se ve en el Total.
        total_item = _par_precios(
            _formato_precio(item.get('subtotal_efectivo')),
            _formato_precio(item.get('subtotal_tarjeta')),
            anchos_fila[3],
        )

        data += ESC + b'a\x00'
        for linea in _fila_articulo(descripcion, unitario, cantidad, total_item, anchos_fila):
            data += _texto(linea + "\n")
        data += b'\n'

    data += _texto("-" * columnas + "\n")
    # --- Total, con las etiquetas Efectivo/Tarjeta debajo de cada importe ---
    anchos_total = _anchos_total(columnas)
    # A doble ancho cada caracter ocupa 2 columnas: media medida por columna.
    anchos_importes = tuple(ancho // 2 for ancho in anchos_total)

    data += b'\n'
    data += ESC + b'a\x00'
    data += ESC + b'E\x01'
    data += GS + b'!' + bytes([TAMANO_DOBLE])
    # "TOTAL" pegado al margen izquierdo, Efectivo/Tarjeta centrados en el resto.
    data += _texto(
        _fila_total(
            "TOTAL",
            _formato_precio(remito.get('total_efectivo')),
            _formato_precio(remito.get('total_tarjeta')),
            anchos_importes,
        )
        + "\n"
    )
    data += GS + b'!' + bytes([TAMANO_NORMAL])
    data += _texto(_fila_total("", "Efectivo", "Tarjeta", anchos_total) + "\n")
    data += ESC + b'E\x00'

    # --- Pie: aclaracion legal ---
    data += b'\n\n'
    data += ESC + b'a\x01'
    data += _texto(_centrar("No valido como factura", columnas) + "\n")
    data += ESC + b'a\x00'

    # Alimentar papel
    data += ESC + b'd\x07'

    # Corte
    data += GS + b'V\x00'

    # Las copias salen como UN solo trabajo de impresion: repetir el buffer es una
    # copia de memoria contra abrir/cerrar el spooler una vez por ticket. Cada copia
    # arranca con su propio ESC @ y termina en su corte, asi que sale autocontenida.
    _imprimir_raw("Remito", bytes(data) * copias, printer_name)
