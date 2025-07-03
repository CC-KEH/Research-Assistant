// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    research_assistant_lib::run()
}
// https://www.semanticscholar.org/product/api/tutorial
// https://api.core.ac.uk/docs/v3#tag/Search/operation/optionsCustomSearchAggregation
