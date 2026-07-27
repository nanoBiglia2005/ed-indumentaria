import win32print


def imprimir_barcode(codigo, printer_name: str | None = None) -> None:
    ESC = b'\x1B'
    GS = b'\x1D'

    # GetDefaultPrinter() es una impresora predeterminada por sesion de usuario:
    # bajo el servicio de Windows (cuenta LocalSystem) no coincide con la del
    # usuario interactivo, asi que hay que pasar el nombre explicitamente.
    hPrinter = win32print.OpenPrinter(printer_name or win32print.GetDefaultPrinter())

    try:
        win32print.StartDocPrinter(hPrinter, 1, ("Barcode", None, "RAW"))
        win32print.StartPagePrinter(hPrinter)

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

        win32print.WritePrinter(hPrinter, bytes(data))

        win32print.EndPagePrinter(hPrinter)
        win32print.EndDocPrinter(hPrinter)
    finally:
        win32print.ClosePrinter(hPrinter)
