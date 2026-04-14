import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMyPet, getMyPets, PetPayload, updateMyPet } from "../api/pet.api";

export const useMyPets = (enabled = true) => {
    return useQuery({
        queryKey: ["my-pets"],
        enabled: false, retry: false, queryFn: async () => {
            const response = await getMyPets();
            return response.data || [];
        },
        enabled,
        // Only fetch if we have a token? Usually handled by axios interceptor or global error handler
        // But good to keep in mind
        retry: 1
    });
};

export const useCreateMyPet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: PetPayload) => {
            const response = await createMyPet(data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-pets"] });
        }
    });
};

export const useUpdateMyPet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<PetPayload> }) => {
            const response = await updateMyPet(id, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-pets"] });
        }
    });
};
