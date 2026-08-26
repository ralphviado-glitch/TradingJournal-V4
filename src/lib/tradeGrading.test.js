import { describe,expect,it } from "vitest";
import { gradeTradeReview,isQuickReviewComplete } from "./tradeGrading";
const perfect={setupTagIds:["tag"],sequence:{break:"met",displacement:"met",acceptance:"met",retest:"met",hold:"met",trigger:"met"},marketContext:"aligned",roomQuality:"good",plannedLevel:"yes",validEntryTrigger:"yes",stopFollowed:"yes",riskFollowed:"yes",managementFollowed:"yes",exitPlanFollowed:"yes",ruleViolations:["None"]};
describe("trade review grading",()=>{
  it("grades perfect process A+ regardless of outcome",()=>{expect(gradeTradeReview(perfect,"win")).toMatchObject({setupGrade:"A+",executionGrade:"A+",finalGrade:"A+",outcomeClassification:"Excellent Trade"});expect(gradeTradeReview(perfect,"loss")).toMatchObject({setupGrade:"A+",executionGrade:"A+",finalGrade:"A+",outcomeClassification:"Good Loss"})});
  it("penalizes anticipated entries without changing setup",()=>{const g=gradeTradeReview({...perfect,ruleViolations:["Anticipated Entry"]},"win");expect(g.setupGrade).toBe("A+");expect(["C","D","F"]).toContain(g.executionGrade);expect(g.finalGrade).not.toBe("A+")});
  it("applies oversized and moved-stop caps",()=>{expect(gradeTradeReview({...perfect,ruleViolations:["Oversized"]}).executionGrade).toBe("C");expect(gradeTradeReview({...perfect,ruleViolations:["Moved Stop Wider"]}).executionGrade).toBe("D")});
  it("prevents poor setup from becoming A+",()=>{const g=gradeTradeReview({...perfect,sequence:{...perfect.sequence,break:"not_met",trigger:"not_met"}},"win");expect(["C","D","F"]).toContain(g.setupGrade);expect(g.finalGrade).not.toBe("A+");expect(g.outcomeClassification).toBe("Bad Win")});
  it("allows retest and hold N/A under generic v1 rules",()=>{const review={...perfect,sequence:{...perfect.sequence,retest:"na",hold:"na"}};expect(gradeTradeReview(review).setupGrade).toBe("A+");expect(isQuickReviewComplete(review)).toBe(true)});
  it("requires setup, sequence, context, execution, and explicit violations",()=>{expect(isQuickReviewComplete(perfect)).toBe(true);expect(isQuickReviewComplete({...perfect,setupTagIds:[]})).toBe(false);expect(isQuickReviewComplete({...perfect,ruleViolations:undefined})).toBe(false)});
});
