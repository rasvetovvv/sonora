import { useQuery } from "@tanstack/react-query";
import { getLikes } from "@/lib/api";
import { TrackList } from "@/components/TrackList";

export function LikesView() {
  const q = useQuery({ queryKey: ["likes-page"], queryFn: getLikes });
  return (
    <TrackList
      title="Любимое"
      subtitle="Треки, которым вы поставили лайк"
      tracks={q.data?.tracks ?? []}
      loading={q.isLoading}
      error={q.isError ? "Не удалось загрузить" : null}
      empty={<p>Пока нет лайков — жмите ♥ на треках</p>}
    />
  );
}
