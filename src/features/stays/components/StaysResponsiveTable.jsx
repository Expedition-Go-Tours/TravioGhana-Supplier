import { cn } from "@/lib/utils";

/**
 * A table that becomes a stack of cards on small screens.
 *
 * The prototype kept `min-width: 650px` tables inside `overflow: auto`, which
 * (a) forced horizontal scrolling on every phone and (b) made the whole
 * Overview page overflow its grid column below ~600px — the one real layout
 * bug found in the mobile audit. This component renders a real <table> from
 * `md` up and label/value cards below it, from the same column config, so the
 * two presentations can never drift apart.
 *
 * Desktop styling follows the portal's table conventions (xs uppercase
 * headers on gray-100 rules, sm slate rows).
 *
 * columns: [{ key, label, render?(row), className?, hideOnCard? }]
 * rows:    the data; `getRowKey(row, index)` must return a stable key.
 */
export default function StaysResponsiveTable({
  columns,
  rows,
  getRowKey = (row, index) => row.id ?? index,
  onRowClick,
  emptyState,
  ariaLabel,
  className,
}) {
  if (!rows?.length) {
    return emptyState ? <div>{emptyState}</div> : null;
  }

  const interactive = Boolean(onRowClick);

  return (
    <div className={className}>
      {/* ── md and up: a real table ───────────────────────────────────── */}
      <div className="hidden overflow-auto md:block">
        <table className="w-full min-w-[560px] border-collapse text-left" aria-label={ariaLabel}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "border-b border-gray-100 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500",
                    column.className,
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className={cn(
                  "border-b border-gray-100 last:border-0",
                  interactive && "cursor-pointer transition-colors hover:bg-gray-50/60",
                )}
                onClick={interactive ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-3.5 text-sm text-slate-700", column.className)}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── below md: one card per row ────────────────────────────────── */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row, index) => (
          <li
            key={getRowKey(row, index)}
            className={cn(
              "rounded-xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-900/5",
              interactive && "cursor-pointer active:bg-gray-50",
            )}
            onClick={interactive ? () => onRowClick(row) : undefined}
          >
            <div className="mb-2.5">
              {columns[0].render ? columns[0].render(row) : row[columns[0].key]}
            </div>
            <dl className="space-y-2">
              {columns.slice(1).filter((column) => !column.hideOnCard).map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {column.label}
                  </dt>
                  <dd className="text-right text-sm text-slate-700">
                    {column.render ? column.render(row) : row[column.key]}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
