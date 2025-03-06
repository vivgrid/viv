export class VivError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VivError'
  }
}
