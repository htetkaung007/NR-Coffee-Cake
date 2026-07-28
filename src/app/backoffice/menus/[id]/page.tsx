interface props {
  params: {
    id: string;
  };
}

export default async function MenuUpdatePage({ params }: props) {
  return (
    <div>
      <h1>Menu Update Page</h1>
      <p>Menu ID: {params.id}</p>
    </div>
  );
}
