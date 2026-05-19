import { authClient } from "@/lib/auth-client"
import type { LoginInput } from "../schemas/auth.schema"

export const authService = {
  async login(credentials: LoginInput) {
    const result = await authClient.signIn.email({
      email: credentials.email,
      password: credentials.password,
    })

    if (result.error) {
      throw new Error(result.error.message ?? "Login gagal")
    }

    return result.data
  },

  async logout() {
    await authClient.signOut()
  },

  async getSession() {
    return authClient.getSession()
  },
}
