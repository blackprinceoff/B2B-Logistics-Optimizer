package com.logistics.controller;

import com.logistics.dto.AnalysisResult;
import com.logistics.service.AnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService analysisService;

    @GetMapping("/")
    public String showMapPage() {
        return "index";
    }

    @GetMapping("/analysis")
    public String showAnalysisPage() {
        return "analysis";
    }

    @GetMapping("/api/analysis/data")
    @ResponseBody
    public AnalysisResult getAnalysisData() {
        return analysisService.runFullAnalysis();
    }
}