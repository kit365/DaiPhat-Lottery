import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBreeds, createBreed } from "../api/breed.api";

export const useClientBreeds = (type?: string, unique: boolean = false) => {
    return useQuery({
        queryKey: ["client-breeds", type, unique],
        queryFn: () => getBreeds(type, unique),
        select: (res) => res.data || [],
    });
};

export const useClientCreateBreed = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createBreed,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client-breeds"] });
        },
    });
};
