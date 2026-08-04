export function PlaceholderScreen({
  iconPath,
  evenOdd,
  title,
  description,
}: {
  iconPath: string;
  evenOdd?: boolean;
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center lg:px-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brine/10">
        <svg className="h-7 w-7 text-brine" viewBox="0 0 20 20" fill="currentColor">
          <path d={iconPath} fillRule={evenOdd ? "evenodd" : undefined} clipRule={evenOdd ? "evenodd" : undefined} />
        </svg>
      </div>
      <h2 className="mt-5 text-xl font-semibold text-inktext">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}
