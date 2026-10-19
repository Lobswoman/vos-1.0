import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../database/init.js';
import {createApp} from '../src/app.js';
const dir=mkdtempSync(join(tmpdir(),'vos-browser-'));
const db=openDatabase(join(dir,'database.db'));
const server=createApp(db).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const url=`http://127.0.0.1:${server.address().port}`;
let browser;try{browser=await chromium.launch({...(process.env.VOS_CHROMIUM_PATH?{executablePath:process.env.VOS_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});}catch(error){await new Promise(r=>server.close(r));db.close();rmSync(dir,{recursive:true,force:true});throw error;}
const results=[];mkdirSync('artifacts',{recursive:true});
async function checkpoint(page,name){await page.screenshot({path:`artifacts/${name}.png`,fullPage:true});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,`Sem overflow: ${name}`);}
async function fillPerson(page,n,minor=false){await page.locator(`#nome-${n}`).fill('Pessoa Ficticia Teste');await page.locator(`#cpf-${n}`).fill('52998224725');await page.locator(`#nascimento-${n}`).fill(minor?'2015-05-20':'1995-03-10');await page.locator(`#telefone-${n}`).fill('38999990000');if(minor){await page.locator(`#responsavelNome-${n}`).fill('Responsavel Ficticio Teste');await page.locator(`#responsavelCpf-${n}`).fill('11144477735');await page.locator(`#vinculo-${n}`).fill('Mãe');}}
async function drawMouse(page){const c=await page.locator('#signature').boundingBox();await page.mouse.move(c.x+30,c.y+90);await page.mouse.down();await page.mouse.move(c.x+80,c.y+30,{steps:12});await page.mouse.move(c.x+120,c.y+100,{steps:12});await page.mouse.move(c.x+180,c.y+45,{steps:12});await page.mouse.up();}
async function drawTouch(page,context){const c=await page.locator('#signature').boundingBox();const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:c.x+30,y:c.y+60}]});for(let i=1;i<15;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:c.x+30+i*8,y:c.y+60+Math.sin(i)*20}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
async function journey(mode,seat,viewport,minor=false){const context=await browser.newContext({reducedMotion:'reduce',...viewport});const page=await context.newPage();const issues=[];page.on('pageerror',e=>issues.push(e.message));page.on('console',m=>{if(m.type()==='error')issues.push(m.text());});const outside=[];page.on('request',r=>{if(!r.url().startsWith(url))outside.push(r.url());});await page.goto(url);await page.locator('#start').waitFor();await checkpoint(page,`${mode}-home`);
 await page.locator('#start').click();await page.locator('[data-seat]').first().waitFor();assert.equal(await page.locator('[data-seat]').count(),44);
 if(mode==='desktop'){
  await page.keyboard.press('Tab');const focus=await page.evaluate(()=>document.activeElement?.tagName);assert.equal(focus,'BUTTON');await page.keyboard.press('Enter');assert.equal(await page.locator('[aria-pressed=true]').count(),1);await page.keyboard.press('Enter');assert.equal(await page.locator('[aria-pressed=true]').count(),0);
  for(const s of [1,2,6,5,9])await page.locator(`[data-seat="${s}"]`).click();await page.locator('[data-seat="10"]').click();assert.match(await page.locator('#message').innerText(),/cinco/);assert.equal(await page.locator('[aria-pressed=true]').count(),5);
  for(const s of [9,5,6,2,1])await page.locator(`[data-seat="${s}"]`).click();assert.equal(await page.locator('[aria-pressed=true]').count(),0);
  await page.locator('[data-seat="1"]').click();await page.locator('[data-seat="3"]').click();assert.match(await page.locator('#message').innerText(),/sequência/);await page.locator('[data-seat="1"]').click();
 }
 await page.locator(`[data-seat="${seat}"]`).click();await checkpoint(page,`${mode}-seats`);await page.locator('#next').click();
 await page.locator(`#nome-${seat}`).fill('Pessoa Ficticia Teste');await page.locator(`#cpf-${seat}`).fill('11111111111');await page.locator(`#nascimento-${seat}`).fill('1995-03-10');await page.locator(`#telefone-${seat}`).fill('38999990000');await page.locator('#next').click();assert.match(await page.locator('#message').innerText(),/CPF inválido/);
 await fillPerson(page,seat,minor);if(mode==='desktop'){await page.reload();await page.locator('#start').click();await page.locator('[data-seat]').first().waitFor();await page.locator('#next').click();assert.equal(await page.locator(`#nome-${seat}`).inputValue(),'Pessoa Ficticia Teste');}await checkpoint(page,`${mode}-people`);
 await page.locator('#back').click();await page.locator('#next').click();assert.equal(await page.locator(`#nome-${seat}`).inputValue(),'Pessoa Ficticia Teste');await page.locator('#next').click();
 await page.locator('#next').click();assert.match(await page.locator('#message').innerText(),/aceitar/);await page.locator('#baggage').check();await page.locator('#next').click();await page.locator('#signatory').fill('Responsavel Ficticio Teste');await page.locator('#next').click();assert.match(await page.locator('#message').innerText(),/assinatura/);
 if(mode==='mobile')await drawTouch(page,context);else await drawMouse(page);await page.locator('#clear-signature').click();assert.match(await page.locator('#signature-status').innerText(),/limpa/);if(mode==='mobile')await drawTouch(page,context);else await drawMouse(page);await checkpoint(page,`${mode}-contract`);await page.locator('#next').click();
 await page.getByRole('radio',{name:/PIX/}).check();await page.locator('#next').click();await page.locator('#confirm').check();await checkpoint(page,`${mode}-review`);
 if(mode==='desktop'){
 let dropped=false;
 await page.route('**/api/reservas',async route=>{if(!dropped){dropped=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 await page.locator('#next').click();await page.getByRole('button',{name:'Tentar novamente'}).waitFor();assert.match(await page.locator('#message').innerText(),/conectar/);
 // Network failure is deliberately induced; only expected transport console errors are removed.
 for(let i=issues.length-1;i>=0;i--)if(issues[i].includes('net::ERR_FAILED'))issues.splice(i,1);
 }
 const start=performance.now();await page.locator('#next').click();await page.locator('.voucher').waitFor();const elapsed=performance.now()-start;
 assert.match(await page.locator('.voucher').innerText(),/PENDENTE/);assert.match(await page.locator('.voucher').innerText(),/Pessoa Ficticia Teste/);await checkpoint(page,`${mode}-voucher`);
 const code=await page.locator('.boarding-code').innerText();await page.reload();await page.locator('.voucher').waitFor();assert.equal(await page.locator('.boarding-code').innerText(),code);
 if(mode==='desktop'){await page.emulateMedia({media:'print'});await page.pdf({path:'artifacts/voucher-demonstracao.pdf',format:'A4',printBackground:true});await page.emulateMedia({media:'screen'});}
 await page.locator('#new').click();await page.locator('#start').waitFor();await page.locator('#start').click();await page.locator('[data-seat]').first().waitFor();assert.equal(await page.locator(`[data-seat="${seat}"]`).isDisabled(),true);
 assert.deepEqual(issues,[],`Sem erros de navegador em ${mode}`);assert.deepEqual(outside,[],`Sem requisições externas em ${mode}`);results.push({mode,status:'APROVADO',conclusaoMs:Math.round(elapsed),viewport:viewport.viewport||viewport});await context.close();}
try{
 await journey('desktop',1,{viewport:{width:1440,height:1000}});
 await journey('mobile',3,{...devices['Pixel 7']},true);
 for(const [name,size] of [['notebook',{width:1366,height:768}],['tablet',{width:768,height:1024}]]){const context=await browser.newContext({reducedMotion:'reduce',viewport:size});const page=await context.newPage();await page.goto(url);await page.locator('#start').waitFor();await page.locator('#start').click();await page.locator('[data-seat]').first().waitFor();await checkpoint(page,`${name}-seats`);assert.equal(await page.locator('[data-seat]').count(),44);results.push({mode:name,status:'APROVADO',scope:'Mapa e layout',viewport:size});await context.close();}
 const context=await browser.newContext();const page=await context.newPage();
 await page.route('**/api/viagens',route=>route.fulfill({json:[]}));await page.goto(url);await page.getByRole('heading',{name:'Nenhuma viagem por aqui ainda.'}).waitFor();
 await page.unroute('**/api/viagens');await page.route('**/api/viagens',route=>route.fulfill({status:503,json:{erro:'Servidor indisponível no teste.'}}));await page.reload();await page.getByRole('heading',{name:'Não foi possível carregar.'}).waitFor();assert.match(await page.locator('#message').innerText(),/indisponível/);await context.close();
 results.push({mode:'falhas controladas',status:'APROVADO',scope:'Viagem ausente, API indisponível e perda de resposta após gravação'});
 console.log(JSON.stringify(results,null,2));writeFileSync('artifacts/browser-results.json',JSON.stringify({executadoEm:new Date().toISOString(),results},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));db.close();rmSync(dir,{recursive:true,force:true});}
