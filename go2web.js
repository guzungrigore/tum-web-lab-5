#!/usr/bin/env node

const {program} = require("commander");
const https = require("https");
const http = require("http");
const cheerio = require("cheerio");
const fs = require("fs");
let isSearching = false;
let cleanedResponse;
const fetchContentFromUrl = (urlString) => {
    const url = new URL(urlString);
    let cacheBuffer;
    let dataChunks = [];
    const protocol = url.protocol === 'https:' ? https : http;
    fs.readFile('cache.json', (err, data) => {
        if (err) {
            console.error(err);
            return
        }

        try {
            cacheBuffer = JSON.parse(data.toString());
        } catch (error) {
            cacheBuffer = {};
        }

        if (cacheBuffer.hasOwnProperty(urlString)) {
            console.log('Process data from Cache')
            console.log(cacheBuffer[urlString])
            return
        }

    const request = protocol.request({
        hostname: url.hostname,
        port: url.protocol === 'https:' ? 443 : 80,
        path: url.pathname + url.search,
        method: "GET",
        headers: {
            "Accept": "application/json, text/html"
        }
    }, (response) => {
        response.on("data", (chunk) => {
            dataChunks.push(chunk);
        });

        response.on("end", () => {
            const contentType = response.headers["content-type"];
            const statusCode = response.statusCode;
            const location = response.headers['location'];
            const fullResponse = Buffer.concat(dataChunks).toString();
            processResponse(fullResponse, contentType, urlString,statusCode, location);
            if (!cacheBuffer.hasOwnProperty(urlString)) {
                cacheBuffer[urlString] = cleanedResponse;
                fs.writeFile('cache.json', JSON.stringify(cacheBuffer), function (err) {
                    if (err) throw err;
                });
                console.log('Data Cached')
            }
        });
    });

    request.on("error", (error) => {
        console.error("Request Error:", error);
    });

    request.end();
    });
};


const processResponse = (responseBody, contentType, urlString, statusCode, location) => {
    if ([301, 302, 307, 308].includes(statusCode) && location) {
        console.log('Redirecting to ${location} (${statusCode})');
        fetchContentFromUrl(location);
    } else {
        if (isSearching) {
            processSearchContent(responseBody, urlString);
            isSearching = false
            return
        }
        if (contentType.includes("text/html")) {
            processHtmlContent(responseBody);
        } else if (contentType.includes("application/json")) {
            processJsonContent(responseBody);
        }
    }

};

const processSearchContent = (htmlContent, baseUrl) => {
    const $ = cheerio.load(htmlContent);
    let uniqueLinks = new Set();

    $('a').each(function () {
        let link = $(this).attr('href');
        if (link && !link.startsWith('javascript:') && !link.startsWith('mailto:')) {
            link = new URL(link, baseUrl).toString();
            uniqueLinks.add(link);
        }
    });

    Array.from(uniqueLinks).slice(13, 23).forEach((link) => {
        console.log(link);
    });
};

const processHtmlContent = (html) => {
    const $ = cheerio.load(html);
    $("img").each(function () {
        const src = $(this).attr("src");
        $(this).replaceWith(`Image: ${src}\n`);
    });
    $("style, script, iframe").remove();

    cleanedResponse = cleanTextContent($("body").text());
    console.log(cleanedResponse);

};

const processJsonContent = (jsonText) => {
    try {
        const jsonData = JSON.parse(jsonText);
        cleanedResponse = JSON.stringify(jsonData, null, 2);
        console.log(cleanedResponse);
    } catch (error) {
        console.error("JSON Parsing Error:", error.message);
    }
};

const cleanTextContent = (text) => {
    return text.replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n/g, "\n\n").trim();
};

const searchContent = (searchTerm) => {
    const searchUrl = `https://www.bing.com/search?q=${searchTerm.toLowerCase()}`;
    isSearching = true;
    fetchContentFromUrl(searchUrl);
};

program
    .description("Web Request Command Line Tool")
    .option("-u, --url <URL>", "Fetch content from the specified URL")
    .option("-s, --search <searchTerm>", "Fetch content from the specified URL")
    .action((cmd) => {
        if (cmd.url) {
            fetchContentFromUrl(cmd.url)
        } else if (cmd.search) {
            searchContent(cmd.search)
        }
    });

program.parse(process.argv);