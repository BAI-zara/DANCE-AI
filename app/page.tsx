"use client"

import dynamic from "next/dynamic"

const DanceStudio = dynamic(() => import("./components/DanceStudio"), {
  ssr: false,
})

export default function Page() {
  return <DanceStudio />
}
