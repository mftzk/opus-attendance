"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

export function StudentSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(defaultValue)

  return (
    <form
      className="row"
      onSubmit={(event) => {
        event.preventDefault()
        const next = new URLSearchParams(params.toString())
        if (value.trim()) next.set("search", value.trim())
        else next.delete("search")
        router.push(`/students?${next.toString()}`)
      }}
    >
      <input
        type="search"
        placeholder="Search name or ID"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        style={{ width: 220 }}
      />
      <button className="button small" type="submit">
        Search
      </button>
    </form>
  )
}
