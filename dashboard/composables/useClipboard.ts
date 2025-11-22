export const useClipboard = () => {
  const { success, error } = useToast()

  const copy = async (text: string, successMessage = 'Copied to clipboard!') => {
    try {
      await navigator.clipboard.writeText(text)
      success(successMessage)
      return true
    } catch (err) {
      error('Failed to copy to clipboard')
      return false
    }
  }

  return {
    copy
  }
}

