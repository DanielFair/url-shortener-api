const express = require('express');
const mongodb = require('mongodb');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const path = require('path');
const url = 'mongodb://localhost:27017/urlshort'
const URI = process.env.MONGOLAB_URI || process.env.MONGODB_URI;
const app = express();
const port = process.env.PORT || 3000;

console.log(URI);

//Middleware
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


//Connect to database and start server
mongodb.MongoClient.connect(URI, (err, database) => {
    if(err) console.log(err);
    db = database;
    app.listen(port, () => {
        console.log('Server listening on port '+port+'!');
    });
})
app.get('/', (req, res) => {
    res.render('index');
})

app.get('/new/:URL*', (req, res) => {
    let urlParam = req.params.URL + req.params[0];
    let checkObj = {'original_url': urlParam};
    var regex = new RegExp("^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_\+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?");
    if(regex.test(urlParam)){
        //Valid URL format
        db.collection('shortURLs').find(checkObj).toArray().then((result) => {
            if(result.length > 0){
                //Entry exists in DB with matching URL, return existing object
                console.log('Exists in DB!');
                res.render('results', {
                    origUrl: result[0].original_url,
                    shortUrl: result[0].short_url
                });
            }
            else {
                //No match in the database, create new entry for URL
                console.log('No matches in DB, generating new ID!');
                let shortId = generateUniqueId();
                let short_url = 'localhost:3000/'+shortId;
                let newObj = {'original_url': urlParam, 'short_url': short_url};
                console.log('newObj: ', newObj);
                db.collection('shortURLs').insert(newObj, (err, result) => {
                    if(err) throw err;
                    //Inserted successfully, now render results template HTML
                    res.render('results', {
                        origUrl: urlParam,
                        shortUrl: short_url
                    });
                });       
            }
        }).catch((err) => {
            if(err) console.log(err);
        })
    }
    else{
        //Render error page
        res.render('error', {
            errorMsg: 'Please enter a valid URL, in the http://www.example.com format.'
        });
    }
});

app.get('/:shortUrl', (req, res) => {
    let shortUrl = 'localhost:3000/'+req.params.shortUrl;
    db.collection('shortURLs').find({'short_url': shortUrl}).toArray()
    .then((result) => {
        if(result.length > 0) {
            //Match found in database, redirect to full URL
            console.log('Short URL match found in DB!');
            let redirectUrl = result[0].original_url;
            console.log(redirectUrl);
            res.writeHead(301,
            {Location: redirectUrl}
            );
            res.end();
        }
        else{
            //No match in DB
            res.render('error', {
                errorMsg: 'No match found in database for the specified short URL.'
            });
        }
    }).catch((err) => {
        if(err) console.log(err);
    })
});


const generateUniqueId = () => {
    return Math.floor(Math.random() * 10000);
};