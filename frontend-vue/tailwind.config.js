/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          border: "hsl(var(--sidebar-border))",
        },
        // Escalas literais da marca (uso pontual: fundos sutis, swatches).
        // Os tokens semânticos acima (primary, background, foreground...)
        // são os que reagem ao dark mode — prefira-os no dia a dia.
        brand: {
          50: "#FFFBEB",
          100: "#FFF4C2",
          400: "#FFE04D",
          500: "#FFD500",
          600: "#E6C000",
          700: "#B89800",
        },
        ink: {
          DEFAULT: "#0A0A0A",
          900: "#171717",
          600: "#525252",
          300: "#D4D4D4",
          100: "#F5F5F5",
        },
      },
      // Radius base 8px (botões, inputs e cards herdam via xl/2xl).
      borderRadius: {
        sm: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "var(--radius)",
        "2xl": "var(--radius)",
      },
      boxShadow: {
        // Sombras shadcn "New York" — mais sutis e precisas.
        card: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
        "card-md": "0 4px 12px rgba(0, 0, 0, 0.10)",
        glow: "0 0 15px rgba(255, 213, 0, 0.35)",
      },
    },
  },
  plugins: [],
};
