import type { MetadataState } from '../../store/metadata.store';

/**
 * In-flight load promises are not serializable; expose them as a boolean
 * flag plus the list of in-flight track IDs for readability. (ETC_007)
 */
export function serializeMetadataState(state: MetadataState) {
  const inflightIds = Object.keys(state.inflight);
  return {
    byId: state.byId,
    indexStatus: state.indexStatus,
    indexError: state.indexError ?? null,
    hasInflight: inflightIds.length > 0,
    inflightIds,
  };
}
