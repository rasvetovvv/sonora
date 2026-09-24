import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUploads, deleteUpload } from "@/lib/api";
import { TrackList } from "@/components/TrackList";

export function LibraryView({ onUpload }: { onUpload: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["uploads"], queryFn: getUploads });
  useMutation({
    mutationFn: deleteUpload,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["uploads"] }),
  });

  return (
    <TrackList
      title="Мои треки"
      subtitle="Загруженные вами файлы"
      tracks={q.data?.tracks ?? []}
      loading={q.isLoading}
      error={q.isError ? "Не удалось загрузить" : null}
      empty={
        <div className="flex flex-col items-center gap-3">
          <p>Вы ещё ничего не загрузили</p>
          <button
            onClick={onUpload}
            className="rounded-full accent-gradient px-5 py-2 text-sm font-bold text-black"
          >
            Загрузить трек
          </button>
        </div>
      }
    />
  );
}
