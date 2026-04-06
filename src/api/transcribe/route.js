export async function POST(req) {
  try {
    const formData = await req.formData()

    const audio = formData.get("file")

    const whisperRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: formData
      }
    )

    const data = await whisperRes.json()

    return Response.json(data)

  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 500 }
    )
  }
}