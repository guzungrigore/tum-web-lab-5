import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.CloseableHttpResponse;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.HttpEntity;
import org.apache.hc.core5.http.HttpStatus;
import org.apache.hc.core5.http.ParseException;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.io.IOException;

public class Go2WebJ {
    public static void main(String[] args) {
        if (args.length == 0) {
            showHelp();
            return;
        }

        String param = args[0];
        switch (param) {
            case "-u":
                if (args.length < 2) {
                    System.out.println("URL not specified.");
                } else {
                    fetchURL(args[1]);
                }
                break;
            case "-h":
                showHelp();
                break;
            default:
                System.out.println("Invalid command.");
                showHelp();
        }
    }

    private static void fetchURL(String url) {
        RequestConfig requestConfig = RequestConfig.custom()
                .setRedirectsEnabled(false)  // Set to false to manually handle redirects
                .build();

        try (CloseableHttpClient client = HttpClients.custom()
                .setDefaultRequestConfig(requestConfig)
                .build()) {
            String currentUrl = url;
            HttpGet request = new HttpGet(currentUrl);
            boolean redirected;
            do {
                redirected = false;
                try (CloseableHttpResponse response = client.execute(request)) {
                    int statusCode = response.getCode();
                    if (statusCode == HttpStatus.SC_MOVED_PERMANENTLY || statusCode == HttpStatus.SC_MOVED_TEMPORARILY ||
                            statusCode == HttpStatus.SC_SEE_OTHER || statusCode == HttpStatus.SC_TEMPORARY_REDIRECT) {
                        String newUrl = response.getFirstHeader("Location").getValue();
                        currentUrl = newUrl;
                        request = new HttpGet(currentUrl);
                        redirected = true;
                        System.out.println("Redirected to: " + currentUrl);
                    } else {
                        HttpEntity entity = response.getEntity();
                        String charset = "UTF-8";
                        if (entity.getContentType() != null) {
                            charset = String.valueOf(org.apache.hc.core5.http.ContentType.parse(entity.getContentType()).getCharset());
                            if (charset == null) {
                                charset = "UTF-8";
                            }
                        }
                        String result = EntityUtils.toString(entity, charset);
                        String cleanText = htmlToText(result);
                        System.out.println(cleanText);
                    }
                }
            } while (redirected);
        } catch (IOException | ParseException e) {
            System.out.println("Failed to fetch the URL: " + e.getMessage());
        }
    }


    private static String htmlToText(String html) {
        Document document = Jsoup.parse(html);
        // Append newlines for block-level elements to ensure proper spacing.
        for (Element element : document.select("br, p, h1, h2, h3, h4, h5, h6, ul, ol, li")) {
            if (element.isBlock() || element.tagName().equals("br")) {
                element.append("\\n");
            }
            if (element.tagName().equals("p") || element.tagName().matches("h[1-6]")) {
                element.prepend("\\n");
            }
        }

        // Handling list tags separately for proper listing format
        for (Element element : document.select("li")) {
            element.append("\\n");
        }

        // Convert the document to text while preserving escaped newlines
        String text = document.text().replaceAll("\\\\n", "\n").trim();
        // Replace multiple consecutive newlines with a single newline
        text = text.replaceAll("(\\n\\s*)+", "\n").trim();

        return text;
    }

    private static void showHelp() {
        System.out.println("go2webJ - Command Line Interface");
        System.out.println("Usage:");
        System.out.println("  go2webJ -u <URL>         # make an HTTP request to the specified URL and print the response");
        System.out.println("  go2webJ -h               # show this help");
    }
}
