from typing import List, Optional

from pydantic import BaseModel, Field, conlist


class TutorExplainInput(BaseModel):
    topic: str = Field(min_length=2, max_length=160)
    context: str = Field(min_length=2, max_length=80)
    userLevel: str = Field(min_length=2, max_length=50)


class TutorExplainOutput(BaseModel):
    explanation: str
    practicalExample: str
    exercise: str
    answerGuide: str


class PlannerGenerateInput(BaseModel):
    availableHoursPerDay: conlist(float, min_length=7, max_length=7)
    goals: List[str] = Field(default_factory=list, max_length=20)
    weakSkills: Optional[List[str]] = Field(default=None, max_length=50)
    examDate: Optional[str] = None


class PlannerItem(BaseModel):
    date: str
    subject: str
    skill: Optional[str] = None
    durationMin: int


class PlannerGenerateOutput(BaseModel):
    weeklyPlan: List[PlannerItem]
