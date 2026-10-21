import { SchemeContext, useColorScheme } from "./telegram/theme";

export function App() {
  const scheme = useColorScheme();
  return (
    <SchemeContext value={scheme}>
      <main style={{ padding: 16 }}>Bunna Passport</main>
    </SchemeContext>
  );
}
