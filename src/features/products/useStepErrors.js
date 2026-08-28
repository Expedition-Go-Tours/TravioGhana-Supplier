import { useProductBuilderStore } from './productBuilderStore'

export function useStepErrors(stepIndex) {
  return useProductBuilderStore((s) => s.stepErrors[stepIndex]) || {}
}
