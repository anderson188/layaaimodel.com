function Cell({ value }: { value: string }) {
  const marked = value.match(/^\*\*(.+)\*\*$/);
  if (marked) return <strong className="font-semibold text-ink">{marked[1]}</strong>;
  return value;
}

export function DataTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <caption className="border-b border-line bg-panel px-4 py-3 text-left text-sm text-muted">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-line text-ink">
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")} className="border-b border-line last:border-0">
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`} className="px-3 py-2 align-top text-muted">
                  <Cell value={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
