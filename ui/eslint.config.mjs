// eslint.config.js
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactRefresh from "eslint-plugin-react-refresh";
import pluginPrettier from "eslint-plugin-prettier";
import configPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", ".vite/"], // Adicione pastas e arquivos a serem ignorados
  },
  pluginJs.configs.recommended, // Regras recomendadas do JavaScript
  ...tseslint.configs.recommended, // Regras recomendadas do TypeScript
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "react-refresh": pluginReactRefresh,
      prettier: pluginPrettier,
    },
    rules: {
      // Regras do React
      "react/react-in-jsx-scope": "off", // Desativa para React 17+ e Vite (onde não precisa importar React explicitamente)
      "react/prop-types": "off", // Geralmente desativado ao usar TypeScript

      // Regras do React Hooks
      "react-hooks/rules-of-hooks": "error", // Verifica regras de Hooks

      // Regras do React Refresh para Vite
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // Regras do TypeScript (algumas sobreescritas ou adicionadas)
      "@typescript-eslint/no-explicit-any": "warn", // Alerta sobre uso de 'any'
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: '^_' }], // Alerta sobre variáveis não utilizadas

      // 'no-unused-vars': ['off', { varsIgnorePattern: '^_' }],

      // Regras do Prettier
      "prettier/prettier": [
        "warn",
        {
          // Configurações do Prettier (se não tiver um .prettierrc)
          // Se você tiver um .prettierrc, o ESLint vai ler ele automaticamente
          singleQuote: true,
          semi: true,
          tabWidth: 2,
          trailingComma: "all",
          printWidth: 130,
        },
      ],

      quotes: [2, 'single', { avoidEscape: true }],
    },
  },
  configPrettier, // Garante que o Prettier e o ESLint não conflitem
);

