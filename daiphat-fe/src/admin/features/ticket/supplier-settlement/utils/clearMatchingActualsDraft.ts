import { clearMatchingActualsDraftJson } from './matchingActualsDraftStorage';
import { clearAllPendingMatchingDraftFiles } from './matchingActualsDraftFiles';

/** Clears both localStorage draft JSON and IndexedDB pending files for a settlement. */
export const clearMatchingActualsDraft = async (settlementId: string | number): Promise<void> => {
    clearMatchingActualsDraftJson(settlementId);
    await clearAllPendingMatchingDraftFiles(settlementId);
};
