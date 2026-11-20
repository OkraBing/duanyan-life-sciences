/* Current series interface, without any network calls. */
async function createSeries(page,{name='脚本凭证',key='TESTKEY-not-a-real-credential',base='https://model.example.test/v1'}={}){
 await page.evaluate(()=>go('set'));await page.locator('[data-act="msnew"]').click();
 await page.locator('#dlg input[name="prov"][value="deepseek"]').check();await page.locator('#dlg [value="ok"]').click();
 await page.locator('#mcn').fill(name);await page.locator('#mck').fill(key);await page.locator('#mcb').fill(base);await page.locator('#dlg [value="ok"]').click();
 await page.waitForFunction(n=>MSERIES().some(s=>s.label===n),name);return page.evaluate(n=>MSERIES().find(s=>s.label===n).id,name);
}
async function changeSeriesKey(page,id,key){await page.evaluate(()=>go('set'));await page.locator('[data-msedit="'+id+'"]').click();await page.locator('#mck').fill(key);await page.locator('#dlg [value="ok"]').click();}
module.exports={createSeries,changeSeriesKey};
