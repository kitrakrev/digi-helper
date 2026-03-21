'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { LogIn } from 'lucide-react'

export default function AuthButton() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleLogin = async () => {
    setIsLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-md font-medium transition-colors"
    >
      <LogIn size={20} />
      {isLoading ? 'Redirecting...' : 'Sign in with Discord'}
    </button>
  )
}
