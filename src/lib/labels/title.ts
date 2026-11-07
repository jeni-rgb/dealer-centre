/** The name printed on a label. Null means leave the saved name as it is. */
export function nextLabelTitle(current: string, typed: string): { title: string | null; error: string | null } {
  const title = typed.trim();
  if (title === current) return { title: null, error: null };
  if (title.length < 2) return { title: null, error: "Enter the name of the piece." };
  if (title.length > 120) return { title: null, error: "That name is too long." };
  return { title, error: null };
}
