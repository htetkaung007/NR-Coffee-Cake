interface MenuFormProps {
  categories: MenuCategoryOption[];
  initialData?: {
    id: number;
    name: string;
    description: string;
    price: number;
    quantity: number;
    isAvailable: boolean;
    categoryIds: number[];
    imageUrl: string | null;
  };
}
export default function MenuForm({ categories, initialData }: MenuFormProps) {
  const isEditMode = Boolean(initialData);

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [price, setPrice] = useState(initialData?.price?.toString() ?? "");
  const [quantity, setQuantity] = useState(initialData?.quantity ?? 1);
  const [isAvailable, setIsAvailable] = useState(initialData?.isAvailable ?? true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    initialData?.categoryIds ?? [],
  );
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    initialData?.imageUrl ?? null,
  );

  // Submit ချိန်မှာ — Create action or Update action ကို ခေါ်ရန် ခွဲရမယ်
  function handleSubmit(...) {
    const action = isEditMode 
      ? () => updateMenuAction(initialData.id, formData)
      : () => createMenuAction(formData);
    // ...
  }

  return (
    <>
      {/* ... UI အားလုံး တူတူ ... */}
      <Button type="submit">
        {isEditMode ? "Save Changes" : "Create Menu"}
      </Button>
    </>
  );
}