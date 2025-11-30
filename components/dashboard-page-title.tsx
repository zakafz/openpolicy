export default function PageTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-1">
      <h1 className="font-medium text-xl tracking-tight">{title}</h1>
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
    </div>
  );
}
