"use server";

import { signIn } from "@/lib/auth";

export async function signInWithGoogle() {
  try {
    await signIn("google", {
      redirectTo: "/es/admin",
      redirect: true
    });
  } catch (error) {
    // NextAuth throws a redirect error as part of the normal flow, 
    // but we catch other unexpected errors here.
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("error_auth_google:", error);
  }
}
