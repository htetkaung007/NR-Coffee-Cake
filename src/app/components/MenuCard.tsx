import Image from "next/image";
import Link from "next/link";

type MenuCardProps = {
  menu: {
    id: number;
    name: string;
    price: number;
    assetUrl: string | null;
    isAvailable?: boolean;
  };
};

export function MenuCard({ menu }: MenuCardProps) {
  return (
    <Link
      href={`/backoffice/menus/${menu.id}`}
      style={{
        display: "block",
        border: "1px solid #ddd",
        borderRadius: 8,
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {menu.assetUrl ? (
        <Image
          src={menu.assetUrl}
          alt={menu.name}
          width={500}
          height={140}
          style={{
            width: "100%",
            height: 140,
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div style={{ width: "100%", height: 140, background: "#f0f0f0" }} />
      )}
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 600 }}>{menu.name}</div>
        <div>{menu.price}</div>
        {!menu.isAvailable && (
          <div style={{ color: "crimson" }}>Unavailable</div>
        )}
      </div>
    </Link>
  );
}
