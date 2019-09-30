const express = require('express')
const app = express()
const SolrNode = require('solr-node')
const cors = require('cors')
const util = require('util')
const dotenv =  require('dotenv')
const path = require('path')

const dotenvConfig = dotenv.config() // Load environment variables
const config = require(path.resolve(__dirname, './config', process.env.NODE_ENV || 'development'))

// Initiate Solr client
const client = new SolrNode({
    host: '127.0.0.1',
    port: '8983',
    core: 'csp-services',
    protocol: 'http'
})

const clientpricing = new SolrNode({
    host: '127.0.0.1',
    port: '8983',
    core: 'csp',
    protocol: 'http'
})

const origins = [
    'http://dev.csp.com:8080',
    'https://dev.csp.com:8080',
    'http://dev.csp.com:8081',
    'https://dev.csp.com:8081',
    'http://dev.csp.com:8083',
    'https://dev.csp.com:8083',
    'http://dev.csp.com:8084',
    'https://dev.csp.com:8084',
    'http://dev.csp.com:3000'
]

app.use(cors({
    origin: origins,
    credentials: true
}))

app.get('/', async (req, res) => {
    return res.send('OK')
})

app.get('/solr/query', (req, res) => {
    const pageNumber = parseInt(req.query.page) || 0
    const rowsPerPage = parseInt(req.query.per_page) || 10

    const page = pageNumber * rowsPerPage
    const objQuery = `q=*%3A*&facet=true&facet.pivot=category,service_full_name&json.nl=map&facet.count=1&start=${page}&rows=${rowsPerPage}`
    // const objQuery = `q=*:*&facet=true&facet.field=service_full_name&facet.field=category&facet.field=region&json.nl=map&start=${page}&rows=${rowsPerPage}`

    // const objQuery = client.query()
    //     .q()
    //     .facetQuery({
    //         on: true,
    //         field: ['service_full_name','region'],
    //         mincount: 1
    //     })
    //     .addParams({ 
    //         wt: 'json', 
    //         indent: true
    //     })
    //     .start(page)
    //     .rows(per_page)

    // Search documents using objQuery
    client.search(objQuery, (err, result) => {
        if (err) {
            console.log('Error searching Solr > ', err)
            return
        }
            return res.status(200).json(result)
        })
})

app.get('/solr/query/id', async (req, res) => {
    const id = req.query.id
    const objQuery = `q=id:${id}`

    const payload = {
        data: ''
    }

    client.search(objQuery, (err, result) => {
        if (err) {
            console.log('Error searching ID from Solr > ', err)
            return res.status(500).json({message: 'Record does not exist'})
        }

        if (result.response.numFound === 0) {
            console.log('Record does not exist!')
            return res.status(500).json({message: 'Record does not exist'})
        }

        // Modify this to include all results when 'MoreLikeThis' feature is implemented
        payload.data = result.response.docs[0]

        const servicePricingQuery = `q=service_short_name:${payload.data.service_short_name}`

        clientpricing.search(servicePricingQuery, (err, resPricing) => {
            if (err) {
                console.log('Error searching ID from Solr > ', err)
                return res.status(500).json({message: 'Record does not exist'})
            }

            // Even if pricing does not exist, we still want to return the payload
            if (resPricing.response.numFound === 0) {
                console.log('Pricing record does not exist, return the payload')
                return res.status(200).json(payload)
            }

            const newVals = resPricing.response.docs.map((y) => {
                return {
                    region: y.region,
                    city: y.city,
                    pricingValue: JSON.parse(y.pricing)
                }
            })

            const newArr = newVals.map((z) => {
                const pricingObjects = z.pricingValue
                let pricingNewArray = []

                for (const val in pricingObjects) {
                    const obj = {}
                    obj.description = val
                    obj.price = pricingObjects[val]['price']
                    // console.log(Number(obj.price).toFixed(4))
                    pricingNewArray.push(obj)
                }

                z.pricingValue = pricingNewArray

                return z
            })

            payload.data.pricing = newArr

            return res.status(200).json(payload)
        })
    })
})

app.get('/solr/query/service_full_name', (req, res) => {
    const service_full_name = req.query.service_full_name
    const objQuery = `q=service_full_name:${service_full_name}`
    client.search(objQuery, (err, result) => {
        if (err) {
            console.log('Error searching service_name from Solr > ', err)
            return res.status(500).json({message: 'Record does not exist'})
        }
        return res.status(200).json(result)
    })
})

app.listen(config.app.port, config.app.host, (err) => {
    if (err) {
        throw err
    }

    console.log(`CSP Web API running at http://${config.app.host}:${config.app.port} in ${app.get('env')}`)
    console.log(' Press CTRL-C to stop \n')
})
