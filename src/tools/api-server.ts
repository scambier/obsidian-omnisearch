import * as http from 'http'
import * as url from 'url'
import api from './api'
import { Notice } from 'obsidian'
import { saveSettings, settings } from 'src/settings'

export function getServer() {
  const server = http.createServer(async function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, HEAD, POST, OPTIONS, PUT, PATCH, DELETE'
    )
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Headers, Origin, Authorization,Accept,x-client-id, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, hypothesis-client-version'
    )
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    try {
      if (req.url) {
        // parse URL
        const parsedUrl = url.parse(req.url, true)
        if (parsedUrl.pathname === '/search') {
          const q = parsedUrl.query.q as string
          const results = await api.search(q)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(results))
        } else {
          res.end()
        }
      }
    } catch (e) {
      res.statusCode = 500
      res.end(e)
    }
  })

  return {
    listen(port: string) {
      console.log(`Omnisearch - Starting HTTP server on port ${port}`)
      server.listen(
        {
          port: parseInt(port),
          host: 'localhost',
        },
        () => {
          console.log(`Omnisearch - Started HTTP server on port ${port}`)
          if (settings.httpApiNotice) {
            new Notice(`Omnisearch - Started HTTP server on port ${port}`)
          }
        }
      )

      server.on('error', e => {
        console.error(e)
        new Notice(
          `Omnisearch - Cannot start HTTP server on ${port}. See console for more details.`
        )
      })
    },
    close() {
      server.close()
      console.log(`Omnisearch - Terminated HTTP server`)
      if (settings.httpApiNotice) {
        new Notice(`Omnisearch - Terminated HTTP server`)
      }
    },
  }
}

export default getServer
export type StaticServer = ReturnType<typeof getServer>
