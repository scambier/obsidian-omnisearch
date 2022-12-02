import { Configuration, OpenAIApi } from 'openai'
import { settings } from 'src/settings'

async function getRelatedKeywords(query: string): Promise<string[]> {
  const configuration = new Configuration({
    apiKey: settings.openAiToken,
  })

  const openai = new OpenAIApi(configuration)

  const completion = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: `Get a list of maximum 5 short concepts related to "${query}". The list is comma-separated, and each concept is 3 words at most.`,
    temperature: 0.7,
    max_tokens: 50,
  })
  const words =
    completion.data.choices[0].text
      ?.split(',')
      .map(w => w.replace(/^[0-9]+\./gm, '').trim())
      .filter(w => w) ?? []
  console.log(words)
  return words
}

export default { getRelatedKeywords }
