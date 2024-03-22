#!/usr/bin/env node

const { program } = require("commander");

program
    .description("Web Request Command Line Tool")
    .option("-u, --url <URL>", "Fetch content from the specified URL")
    .option("-s, --search <searchTerm>", "Fetch content from the specified URL")
    .action((cmd) => {
        if (cmd.url) {
            // http request
        } else if (cmd.search) {
            //searching
        }
    });

program.parse(process.argv);