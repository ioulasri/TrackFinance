import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../app/financialAnalysis.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};new Function('exports',compiled)(exports);
const {analyzeTransactions}=exports;
const now=new Date('2026-11-23T18:00:00');
const tx=(amount,type,date='2026-11-20T12:00:00')=>({amount,type,date,category:'Food & Dining'});
test('empty account has zero balance and no fabricated score or forecast',()=>{
 const data=analyzeTransactions([],[],now);
 assert.equal(data.net_worth,0);assert.equal(data.financial_health_score,null);assert.equal(data.savings_rate,null);
 assert.equal(data.predictions.next_month_spending,null);assert.deepEqual(data.insights,[]);assert.equal(data.months_observed,0);
});
test('string decimals and negative balances are preserved',()=>{
 const data=analyzeTransactions([tx('12.50','income'),tx('22.75','expense')],[],now);
 assert.equal(data.net_worth,-10.25);assert.equal(data.monthly_comparison.current_month,22.75);
 assert.equal(data.financial_health_score,null);assert.equal(data.predictions.next_month_spending,null);
});
test('last day of month is included and deleted records are excluded',()=>{
 const data=analyzeTransactions([tx(20,'expense','2026-10-31T23:59:59'),{...tx(100,'expense'),is_deleted:true}],[],now);
 assert.equal(data.monthly_comparison.previous_month,20);assert.equal(data.net_worth,-20);
});
test('forecast requires three completed months of actual history',()=>{
 const data=analyzeTransactions([tx(10,'expense','2026-08-20'),tx(20,'expense','2026-09-20'),tx(30,'expense','2026-10-20')],[],now);
 assert.equal(data.predictions.next_month_spending,20);assert(!('confidence_score' in data.predictions));
});
