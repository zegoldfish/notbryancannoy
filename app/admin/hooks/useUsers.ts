import { useQuery } from "@tanstack/react-query";
import { getUsersAction } from "@/app/admin/actions";

type UseUsersProps = {
    staleTime?: number;
    gcTime?: number;
};

export function useUsers({ 
    staleTime = 10 * 60 * 1000, 
    gcTime = 20 * 60 * 1000 
}: UseUsersProps = {}) {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const result = await getUsersAction();
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result.users || [];
    },
    staleTime,
    gcTime,
  });
}
