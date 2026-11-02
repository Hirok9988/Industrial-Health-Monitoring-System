import unittest
from app.services.health_service import HealthService, MachineThresholds

class TestHealthService(unittest.TestCase):
    def setUp(self):
        self.thresholds = MachineThresholds()

    def test_normal_conditions(self):
        reading = {
            "temperature": 35.0,
            "current": 1.0,
            "rpm": 1800.0,
            "vibration": 0.2
        }
        assessment = HealthService.evaluate(reading, self.thresholds)
        self.assertEqual(assessment.health_score, 100.0)
        self.assertEqual(assessment.status, "NORMAL")
        self.assertEqual(len(assessment.abnormal_conditions), 0)

    def test_temperature_high_warning(self):
        reading = {
            "temperature": 42.0, # Warning (40), not Critical (50)
            "current": 1.0,
            "rpm": 1800.0,
            "vibration": 0.2
        }
        assessment = HealthService.evaluate(reading, self.thresholds)
        self.assertEqual(assessment.health_score, 85.0) # 100 - 15
        self.assertEqual(assessment.status, "NORMAL") # 85 is >= 80
        
        self.assertEqual(len(assessment.abnormal_conditions), 1)
        self.assertEqual(assessment.abnormal_conditions[0]["parameter"], "temperature")
        self.assertEqual(assessment.abnormal_conditions[0]["severity"], "WARNING")

    def test_current_high_critical(self):
        reading = {
            "temperature": 35.0,
            "current": 2.6, # Critical (2.5)
            "rpm": 1800.0,
            "vibration": 0.2
        }
        assessment = HealthService.evaluate(reading, self.thresholds)
        self.assertEqual(assessment.health_score, 70.0) # 100 - 30
        self.assertEqual(assessment.status, "WARNING") # 70 is < 80 and >= 50
        
        self.assertEqual(len(assessment.abnormal_conditions), 1)
        self.assertEqual(assessment.abnormal_conditions[0]["parameter"], "current")
        self.assertEqual(assessment.abnormal_conditions[0]["severity"], "CRITICAL")

    def test_rpm_low(self):
        reading = {
            "temperature": 35.0,
            "current": 1.0,
            "rpm": 900.0, # Critical (1000)
            "vibration": 0.2
        }
        assessment = HealthService.evaluate(reading, self.thresholds)
        self.assertEqual(assessment.health_score, 70.0)
        self.assertEqual(assessment.status, "WARNING")

    def test_vibration_high(self):
        reading = {
            "temperature": 35.0,
            "current": 1.0,
            "rpm": 1800.0,
            "vibration": 1.2 # Critical (1.0)
        }
        assessment = HealthService.evaluate(reading, self.thresholds)
        self.assertEqual(assessment.health_score, 70.0)
        
        self.assertEqual(len(assessment.abnormal_conditions), 1)
        self.assertEqual(assessment.abnormal_conditions[0]["parameter"], "vibration")
        self.assertEqual(assessment.abnormal_conditions[0]["severity"], "CRITICAL")
        self.assertEqual(assessment.abnormal_conditions[0]["message"], "Possible abnormal vibration")

    def test_multi_parameter_overload(self):
        # temperature + current high with RPM low
        reading = {
            "temperature": 45.0, # Warning
            "current": 1.8,      # Warning
            "rpm": 1400.0,       # Warning
            "vibration": 0.2
        }
        assessment = HealthService.evaluate(reading, self.thresholds)
        
        # 100 - 15 - 15 - 15 = 55 (WARNING status)
        self.assertEqual(assessment.health_score, 55.0)
        self.assertEqual(assessment.status, "WARNING")
        
        self.assertEqual(len(assessment.abnormal_conditions), 1)
        cond = assessment.abnormal_conditions[0]
        self.assertEqual(cond["parameter"], "multi_parameter")
        self.assertEqual(cond["severity"], "CRITICAL")
        self.assertEqual(cond["message"], "Possible motor overload or mechanical obstruction")

    def test_multi_parameter_critical(self):
        # all critical
        reading = {
            "temperature": 55.0, # Critical
            "current": 3.8,      # Critical
            "rpm": 800.0,        # Critical
            "vibration": 1.5     # Critical
        }
        assessment = HealthService.evaluate(reading, self.thresholds)
        
        # 100 - 30 - 30 - 30 - 30 = 0 (CRITICAL status)
        self.assertEqual(assessment.health_score, 0.0)
        self.assertEqual(assessment.status, "CRITICAL")

if __name__ == '__main__':
    unittest.main()
