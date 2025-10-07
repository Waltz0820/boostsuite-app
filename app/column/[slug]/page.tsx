// app/column/[slug]/page.tsx

import { notFound } from 'next/navigation'
import { columns } from '@/lib/columns-data'

type Props = {
  params: {
    slug: string
  }
}

export async function generateStaticParams() {
  return columns.map((col) => ({
    slug: col.slug,
  }))
}

export default function ColumnPage({ params }: Props) {
  const column = columns.find((col) => col.slug === params.slug)

  if (!column) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">{column.title}</h1>
      <p className="text-gray-600 text-sm mb-4">{column.date}</p>
      {column.content && (
  <div
    className="prose max-w-none"
    dangerouslySetInnerHTML={{ __html: column.body }}
  />
)}

    </div>
  )
}
