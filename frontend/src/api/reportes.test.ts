// Tests de masAntiguoDelLimite (api/reportes.ts).
//
// QUE REGLA PROTEGE: el 409 de "tope de reportes alcanzado" NO es un error para
// el usuario sino una pregunta ("¿borramos el mas antiguo?"). Si esta funcion
// dejara de reconocerlo, el modal mostraria un banner rojo en vez de ofrecer el
// reemplazo; y si reconociera cualquier 409, ofreceria borrar un reporte ante
// un error que no tiene nada que ver.
import { describe, it, expect } from 'vitest';
import { CODIGO_LIMITE_REPORTES } from '@backend/types';
import { ApiError } from '@/api/cliente';
import { masAntiguoDelLimite } from '@/api/reportes';

const masAntiguo = { id_reporte: 3, url: '/api/reportes/3/archivo' };

describe('masAntiguoDelLimite', () => {
  it('reconoce el 409 del tope y devuelve el reporte mas antiguo', () => {
    const err = new ApiError(409, { message: 'tope', codigo: CODIGO_LIMITE_REPORTES, masAntiguo });
    expect(masAntiguoDelLimite(err)).toEqual(masAntiguo);
  });

  it('ignora otros 409', () => {
    expect(masAntiguoDelLimite(new ApiError(409, { message: 'Ya existe' }))).toBeNull();
  });

  it('ignora el mismo codigo con otro status y los errores que no son de la API', () => {
    expect(masAntiguoDelLimite(new ApiError(400, { codigo: CODIGO_LIMITE_REPORTES, masAntiguo }))).toBeNull();
    expect(masAntiguoDelLimite(new Error('red'))).toBeNull();
  });
});
