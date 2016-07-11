﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using ScorecardMerge2.Mediators;
using System.Threading.Tasks;

namespace ScorecardMerge2.Controllers
{
    public class ApprenticeshipController : Controller
    {
        private readonly ApprenticeshipMediator _mediator = new ApprenticeshipMediator();

        // GET: Apprenticeship
        public ActionResult Index()
        {
            return RedirectToAction("List");
        }

        public ActionResult List()
        {
            return View("List");
        }

        public ActionResult TestView()
        {
            return View("Test");
        }

        // POST: ListData
        public async Task<JsonResult> ListData(int page, string sortby, string subjectcode, string search, string postcode, int? distance)
        {
            var jsonObject = _mediator.RetrieveProvidersJson(page, sortby ?? "", subjectcode ?? "0", search ?? "", postcode, distance);
            return Json(jsonObject, "application/json");
        }

        // POST: ProviderData
        public JsonResult ProviderData(int ukprn)
        {
            var jsonObject = _mediator.RetrieveProviderDetail(ukprn);
            return Json(jsonObject);
        }
    }
}