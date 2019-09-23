const express = require('express')
const app = express()
const port = 3000
const SolrNode = require('solr-node')
const cors = require('cors')

// Initiate Solr client
const client = new SolrNode({
    host: '127.0.0.1',
    port: '8983',
    core: 'csp-services', // give the correct core name here
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

app.get('/solr/query/id', (req, res) => {
    const id = req.query.id
    // http://localhost:8983/solr/csp/select?q=id:0d73dc20-abc3-11e9-bdf9-09446c0012c4
    const objQuery = `q=id:${id}`

    client.search(objQuery, (err, result) => {
        if (err) {
            console.log('Error searching ID from Solr > ', err)
            return
        }
        return res.status(200).json(result)
    })
})

app.get('/solr/query/service_full_name', (req, res) => {
    const service_full_name = req.query.service_full_name
    const pageNumber = parseInt(req.query.page) || 0
    const rowsPerPage = parseInt(req.query.per_page) || 10

    const page = pageNumber * rowsPerPage

    const objQuery = `q=service_full_name:${service_full_name}`
    // &facet=true&json.nl=map&facet.count=1&start=${page}&rows=${rowsPerPage}`
    // &facet=true&facet.pivot=category,service_full_name,region&json.nl=map&facet.count=1`

    client.search(objQuery, (err, result) => {
        if (err) {
            console.log('Error searching service_name from Solr > ', err)
            return
        }
        return res.status(200).json(result)
    })
})

app.listen(port, () => console.log(`CSP App listening on port ${port}!`))
