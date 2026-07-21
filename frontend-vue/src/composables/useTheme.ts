import { ref } from "vue";

// O index.html já aplicou a classe .dark antes do mount (sem flash);
// aqui só espelhamos o estado e persistimos a escolha do usuário.
const isDark = ref(
  typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark"),
);

export function useTheme() {
  function toggle() {
    isDark.value = !isDark.value;
    document.documentElement.classList.toggle("dark", isDark.value);
    try {
      localStorage.setItem("frota-theme", isDark.value ? "dark" : "light");
    } catch {
      /* storage indisponível — segue sem persistir */
    }
  }
  return { isDark, toggle };
}
