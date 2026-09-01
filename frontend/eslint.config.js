import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // --- Reglas del React Compiler, en `warn` a proposito ---------------
      // eslint-plugin-react-hooks v7 amplio `flat.recommended` de 2 reglas a 17,
      // sumando las del React Compiler. Este proyecto NO usa el compilador, asi
      // que estas reglas son consejos de calidad, no de correctitud: quedan
      // visibles como advertencias sin bloquear el CI.
      //
      // set-state-in-effect marca 23 casos en tres patrones:
      //   A) resetear al abrir un modal  -> se resuelve con el hook
      //      useResetAlCambiar, que ya existe y ajusta el estado durante el
      //      render (patron oficial de React). Es el pendiente prioritario.
      //   B) limpiar una seleccion que dejo de ser valida -> mismo patron.
      //   C) carga de datos (el setCargando(true) sincronico) -> patron
      //      legitimo; se deja como esta.
      // Cuando A y B esten hechos, subir esta regla a 'error'.
      'react-hooks/set-state-in-effect': 'warn',

      // useVirtualizer de TanStack devuelve funciones que el compilador no
      // puede memoizar. No es arreglable desde este codigo: es la libreria.
      'react-hooks/incompatible-library': 'warn',
    },
  },
  {
    // El entry point no participa de Fast Refresh: no exporta nada, monta la
    // app. Las constantes con React.lazy() de main.tsx disparaban un falso
    // positivo de only-export-components.
    files: ['src/main.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Los tests corren con Vitest y no forman parte del bundle.
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
