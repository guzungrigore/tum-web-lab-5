#!/usr/bin/env node
const {program} = require("commander");
const https = require("https");
const cheerio = require("cheerio");

const fetchContentFromUrl = (urlString) => {
    const url = new URL(urlString);
    let dataChunks = [];

    const request = https.request({
        hostname: url.hostname,
        port: 443,
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
            const fullResponse = Buffer.concat(dataChunks).toString();
            processResponse(fullResponse, contentType);
        });
    });

    request.on("error", (error) => {
        console.error("Request Error:", error);
    });

    request.end();
};

const processResponse = (responseBody, contentType) => {
    if (contentType.includes("text/html")) {
        processHtmlContent(responseBody);
    } else if (contentType.includes("application/json")) {
        processJsonContent(responseBody);
    }
};

const processHtmlContent = (html) => {
    const $ = cheerio.load(html);
    $("img").each(function () {
        const src = $(this).attr("src");
        $(this).replaceWith(`Image: ${src}\n`);
    });
    $("style, script, iframe").remove();

    const textContent = cleanTextContent($("body").text());
    console.log(textContent);
};

const processJsonContent = (jsonText) => {
    try {
        const jsonData = JSON.parse(jsonText);
        console.log("Received JSON Response:");
        const prettyJson = JSON.stringify(jsonData, null, 2);
        console.log(prettyJson);
    } catch (error) {
        console.error("JSON Parsing Error:", error.message);
    }
};

const cleanTextContent = (text) => {
    return text.replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n/g, "\n\n").trim();
};
program
    .description("Web Request Command Line Tool")
    .option("-u, --url <URL>", "Fetch content from the specified URL")
    .option("-s, --search <searchTerm>", "Fetch content from the specified URL")
    .action((cmd) => {
        if (cmd.url) {
            fetchContentFromUrl(cmd.url)
        } else if (cmd.search) {
            console.log(cmd.search)
        }
    });

program.parse(process.argv);