use js_sys::Uint8Array;
use pdf_extract::extract_text_from_mem;
use wasm_bindgen::prelude::*;

// mod obsidian;

#[wasm_bindgen]
pub fn extract_pdf_text(arr: Uint8Array) -> Result<String, JsError> {
    match extract_text_from_mem(&arr.to_vec()) {
        Ok(txt) => return Ok(txt),
        Err(e) => return Err(JsError::new(&e.to_string())),
    };
}

// #[wasm_bindgen]
// pub struct ExampleCommand {
//     id: JsString,
//     name: JsString,
// }

// #[wasm_bindgen]
// impl ExampleCommand {
//     #[wasm_bindgen(getter)]
//     pub fn id(&self) -> JsString {
//         self.id.clone()
//     }

//     #[wasm_bindgen(setter)]
//     pub fn set_id(&mut self, id: &str) {
//         self.id = JsString::from(id)
//     }

//     #[wasm_bindgen(getter)]
//     pub fn name(&self) -> JsString {
//         self.name.clone()
//     }

//     #[wasm_bindgen(setter)]
//     pub fn set_name(&mut self, name: &str) {
//         self.name = JsString::from(name)
//     }

//     pub fn callback(&self) {
//         obsidian::Notice::new("hello from rust");
//     }
// }

// #[wasm_bindgen]
// pub fn onload(plugin: &obsidian::Plugin) {
//     let cmd = ExampleCommand {
//         id: JsString::from("example"),
//         name: JsString::from("Example"),
//     };
//     plugin.addCommand(JsValue::from(cmd))
// }
