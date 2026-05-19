"use client"

import { useRouter } from "next/navigation"
import { signIn, signOut, useSession } from "@/lib/auth-client"
import type { LoginInput } from "../schemas/auth.schema"

export function useAuth() {
  const router = useRouter()
  const { data: session, isPending: isLoading } = useSession()

  async function login(credentials: LoginInput) {
    const result = await signIn.email({
      email: credentials.email,
      password: credentials.password,
    })

    if (result.error) {
      throw new Error(result.error.message ?? "Login gagal")
    }

    router.push("/")
    router.refresh()
    return result
  }

  async function logout() {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return {
    session,
    user: session?.user ?? null,
    isLoading,
    isAuthenticated: !!session,
    login,
    logout,
  }
}
