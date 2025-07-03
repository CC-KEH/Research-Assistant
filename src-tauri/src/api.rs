use reqwest::{header, Client};
use serde_json::Value;

pub async fn search_works(
    apikey: &str,
    title: Option<&str>,
    author: Option<&str>,
    year_start: Option<u32>,
    year_end: Option<u32>,
    require_full_text: bool,
    limit: usize,
) -> Result<Value, String> {
    let url = "https://api.core.ac.uk/v3/search/works";
    let mut parts = Vec::new();

    if let Some(t) = title {
        parts.push(format!(r#"title:"{}""#, t));
    }
    if let Some(a) = author {
        parts.push(format!(r#"author:"{}""#, a));
    }
    if let Some(s) = year_start {
        parts.push(format!("yearPublished>=\"{}\"", s));
    }
    if let Some(e) = year_end {
        parts.push(format!("yearPublished<=\"{}\"", e));
    }
    if require_full_text {
        parts.push("_exists_:fullText".to_string());
    }

    let q = if parts.is_empty() {
        // Default to wildcard if nothing provided
        "*".to_string()
    } else {
        parts.join(" AND ")
    };

    let client = Client::new();
    let bearer = format!("Bearer {}", apikey);

    let resp = client
        .get(url)
        .header(header::AUTHORIZATION, bearer)
        .query(&[("q", q), ("limit", limit.to_string())])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;

    let json = resp.json::<Value>().await.map_err(|e| e.to_string())?;
    Ok(json)
}

pub async fn download_work_pdf(apikey: &str, doi: &str) -> Result<Vec<u8>, String> {
    let meta = search_works(Some(doi), apikey)
        .await?
        .get("results")
        .and_then(|r| r.as_array())
        .and_then(|arr| arr.get(0))
        .and_then(|v| v.get("downloadUrl"))
        .and_then(|u| u.as_str())
        .ok_or_else(|| "No downloadUrl found".to_string())?;

    let client = Client::new();
    let res = client
        .get(meta)
        .send()
        .await
        .map_err(|e| format!("Error fetching PDF: {}", e))?
        .error_for_status()
        .map_err(|e| format!("HTTP error: {}", e))?;

    let bytes = res
        .bytes()
        .await
        .map_err(|e| format!("Error reading PDF bytes: {}", e))?;

    Ok(bytes.to_vec())
}

pub async fn get_work_stats(apikey: &str, doi: &str) -> Result<Value, String> {
    let url = "https://api.core.ac.uk/v3/search/works";
    let q = format!("doi:{}", doi);

    let res = Client::new()
        .get(url)
        .header(header::AUTHORIZATION, format!("Bearer {}", apikey))
        .query(&[("q", q), ("limit", "1".to_string())])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;

    let json = res.json::<Value>().await.map_err(|e| e.to_string())?;
    let stats = json["results"]
        .get(0)
        .or_else(|| json.get("data")) // adapt based on actual structure
        .and_then(|rec| rec.get("extra"))
        .and_then(|extra| extra.get("usageStats").or_else(|| extra.get("citations")))
        .cloned()
        .ok_or_else(|| "No usageStats found".to_string())?;

    Ok(stats)
}
//* xxxxxxxxxxxxxxxxxxxx
//* Semantic Scholar
//* xxxxxxxxxxxxxxxxxxxx

pub async fn get_similar_papers(doi: &str, limit: usize) -> Result<Value, String> {
    let url = format!(
        "https://api.semanticscholar.org/graph/v1/paper/{}/similar-papers?fields=title,authors,year,citationCount,url,openAccessPdf&limit={}",
        doi,
        limit
    );

    let client = Client::new();
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Request error: {}", e))?
        .error_for_status()
        .map_err(|e| format!("HTTP error: {}", e))?;

    let json = res.json::<Value>().await.map_err(|e| e.to_string())?;
    Ok(json)
}

pub async fn download_semantic_pdf(doi: &str) -> Result<Vec<u8>, String> {
    // Step 1: Fetch metadata to get openAccessPdf.url
    let metadata_url = format!(
        "https://api.semanticscholar.org/graph/v1/paper/{}?fields=openAccessPdf",
        doi
    );

    let client = Client::new();
    let res = client
        .get(&metadata_url)
        .send()
        .await
        .map_err(|e| format!("Metadata fetch error: {}", e))?
        .error_for_status()
        .map_err(|e| format!("Metadata HTTP error: {}", e))?;

    let json: Value = res.json().await.map_err(|e| e.to_string())?;

    let pdf_url = json
        .get("openAccessPdf")
        .and_then(|pdf| pdf.get("url"))
        .and_then(|url| url.as_str())
        .ok_or_else(|| "No PDF link found".to_string())?;

    // Step 2: Download PDF bytes
    let pdf_res = client
        .get(pdf_url)
        .send()
        .await
        .map_err(|e| format!("PDF download error: {}", e))?
        .error_for_status()
        .map_err(|e| format!("PDF HTTP error: {}", e))?;

    let bytes = pdf_res
        .bytes()
        .await
        .map_err(|e| format!("Error reading PDF bytes: {}", e))?;

    Ok(bytes.to_vec())
}
